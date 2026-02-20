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
    
    // Check if key OR hwid are missing
    if (!key || !hwid || hwid === "undefined") {
        return res.send("INVALID_REQUEST"); 
    }

    const keyData = await db.get(`key_${key}`);
    if (!keyData) return res.send("INVALID_KEY");

    // If key is fresh, lock it to this HWID
    if (!keyData.hwid) {
        await db.set(`key_${key}`, { ...keyData, hwid: hwid });
        console.log(`Key ${key} locked to: ${hwid}`);
        return res.send("SUCCESS");
    }

    // Compare stored HWID with current HWID
    if (keyData.hwid === hwid) {
        return res.send("SUCCESS");
    }
    
    return res.send("HWID_MISMATCH");
});

// --- DISCORD BOT ---
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

client.on('messageCreate', async (message) => {
    // FIX: Ignore messages from bots to prevent double-firing
    if (message.author.bot) return;

    if (message.content === '!gen') {
        // More secure key generation
        const newKey = "GT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        
        // Ensure hwid is explicitly null for a new key
        await db.set(`key_${newKey}`, { hwid: null });
        message.reply(`Key generated: \`${newKey}\``);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
client.login(process.env.TOKEN);
