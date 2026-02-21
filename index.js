const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');
const { QuickDB } = require("quick.db");

const db = new QuickDB();
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- CONFIGURATION ---
const TOKEN = process.env.TOKEN;
const AUTHORIZED_IDS = ["911401729868857434", "1223823990632747109"];

// --- API FOR MOD MENU ---
app.post('/verify', async (req, res) => {
    const { key, hwid } = req.body;
    
    if (!key || !hwid || hwid === "undefined") {
        return res.send("INVALID_REQUEST"); 
    }

    const keyData = await db.get(`key_${key}`);
    if (!keyData) return res.send("INVALID_KEY");

    const allData = await db.all();
    const existingBinding = allData.find(item => 
        item.id.startsWith("key_") && 
        item.value.hwid === hwid && 
        item.id !== `key_${key}`
    );

    if (existingBinding) {
        return res.send("PC_ALREADY_LINKED");
    }

    if (!keyData.hwid) {
        await db.set(`key_${key}`, { ...keyData, hwid: hwid });
        console.log(`Key ${key} locked to HWID: ${hwid}`);
        return res.send("SUCCESS");
    }

    if (keyData.hwid === hwid) {
        return res.send("SUCCESS");
    }
    
    return res.send("HWID_MISMATCH");
});

// --- DISCORD BOT ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Register Slash Commands
    const commands = [
        new SlashCommandBuilder().setName('gen').setDescription('Generate your private HWID key'),
        new SlashCommandBuilder().setName('reset').setDescription('Admin only: Clear all keys from database'),
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user } = interaction;

    // --- /GEN COMMAND ---
    if (commandName === 'gen') {
        // Defer reply immediately to handle database lag and keep it private (ephemeral)
        await interaction.deferReply({ ephemeral: true });

        const allData = await db.all();
        const existingEntry = allData.find(item => 
            item.id.startsWith("key_") && item.value.ownerId === user.id
        );

        // If they already have a key, just tell them what it is
        if (existingEntry) {
            const keyName = existingEntry.id.replace("key_", "");
            const status = existingEntry.value.hwid ? "Locked to a PC" : "Not yet used";
            return interaction.editReply(`**You already have a key!**\nKey: \`${keyName}\`\nStatus: \`${status}\``);
        }

        // Otherwise, generate a new one
        const newKey = "GT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        
        await db.set(`key_${newKey}`, { 
            hwid: null, 
            owner: user.tag,
            ownerId: user.id 
        });

        return interaction.editReply(`**Key Generated!**\nKey: \`${newKey}\`\n*This key is private and visible only to you.*`);
    }

    // --- /RESET COMMAND ---
    if (commandName === 'reset') {
        if (!AUTHORIZED_IDS.includes(user.id)) {
            return interaction.reply({ content: "❌ **Access Denied:** You are not authorized.", ephemeral: true });
        }

        const allData = await db.all();
        const keysToDelete = allData.filter(item => item.id.startsWith("key_"));

        if (keysToDelete.length === 0) {
            return interaction.reply({ content: "The database is already empty.", ephemeral: true });
        }

        for (const entry of keysToDelete) {
            await db.delete(entry.id);
        }

        return interaction.reply({ content: `✅ **Success:** Deleted **${keysToDelete.length}** keys from the database.`, ephemeral: true });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
client.login(TOKEN);
