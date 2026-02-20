const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { QuickDB } = require("quick.db");

const db = new QuickDB();
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- API FOR MOD MENU ---
app.post('/verify', async (req, res) => {
    const { key, hwid } = req.body;
    
    // 1. Check if key OR hwid are missing/empty
    if (!key || !hwid) {
        return res.send("INVALID_REQUEST"); 
    }

    const keyData = await db.get(`key_${key}`);
    if (!keyData) return res.send("INVALID_KEY");

    // 2. If the key is fresh (no HWID assigned yet)
    if (!keyData.hwid) {
        await db.set(`key_${key}`, { ...keyData, hwid: hwid });
        console.log(`Key ${key} locked to HWID: ${hwid}`);
        return res.send("SUCCESS");
    }

    // 3. Strict comparison
    if (keyData.hwid === hwid) {
        return res.send("SUCCESS");
    }
    
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

