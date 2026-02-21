const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { QuickDB } = require("quick.db");

const db = new QuickDB();
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

    // First time use: Lock the key to this HWID
    if (!keyData.hwid) {
        await db.set(`key_${key}`, { ...keyData, hwid: hwid });
        console.log(`Key ${key} (Owner: ${keyData.owner}) now locked to HWID: ${hwid}`);
        return res.send("SUCCESS");
    }

    // Returning user: Compare HWIDs
    if (keyData.hwid === hwid) {
        return res.send("SUCCESS");
    }
    
    return res.send("HWID_MISMATCH");
});

// --- DISCORD BOT ---
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// --- AUTHORIZED ADMIN IDS ---
const authorizedIds = ["911401729868857434", "1223823990632747109"];

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // --- !RESET COMMAND ---
    if (message.content === '!reset') {
        // 1. Check if the user is authorized
        if (!authorizedIds.includes(message.author.id)) {
            return message.reply("❌ **Access Denied:** You do not have permission to reset the database.");
        }

        // 2. Fetch all keys to see what we are deleting
        const allData = await db.all();
        const keysToDelete = allData.filter(item => item.id.startsWith("key_"));

        if (keysToDelete.length === 0) {
            return message.reply("The database is already empty!");
        }

        // 3. Loop through and delete only the keys
        for (const entry of keysToDelete) {
            await db.delete(entry.id);
        }

        return message.reply(`✅ **Database Reset:** Successfully deleted **${keysToDelete.length}** keys.`);
    }

    // --- YOUR !GEN COMMAND CODE CONTINUES HERE ---
    if (message.content === '!gen') {
        // ... (Keep the !gen code from the previous step)
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
client.login(process.env.TOKEN);



