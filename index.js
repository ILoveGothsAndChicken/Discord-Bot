const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { QuickDB } = require("quick.db");

const db = new QuickDB();
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- API FOR MOD MENU ---
app.post('/verify', async (req, res) => {
    console.log("Received verification request:", req.body);
    const { key, hwid } = req.body;
    
    if (!key) return res.send("INVALID");

    const keyData = await db.get(`key_${key}`);
    if (!keyData) return res.send("INVALID");

    // If key has no HWID, lock it to this one
    if (!keyData.hwid) {
        await db.set(`key_${key}`, { ...keyData, hwid: hwid });
        return res.send("SUCCESS");
    }

    // Compare stored HWID with current HWID
    if (keyData.hwid === hwid) return res.send("SUCCESS");
    
    return res.send("HWID_MISMATCH");
});

app.get('/', (req, res) => { res.send("API is Online!"); });

// --- DISCORD BOT ---
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

client.on('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    // Command to generate keys: !gen
    if (message.content === '!gen') {
        const newKey = "GT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        await db.set(`key_${newKey}`, { hwid: null });
        message.reply(`Key generated: \`${newKey}\``);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

client.login(process.env.TOKEN).catch(err => console.log("Discord Login Error: " + err));
