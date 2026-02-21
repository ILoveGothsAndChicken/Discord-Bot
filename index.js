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

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!gen')) return;

    const userId = message.author.id;

    // 1. Fetch all data from the database
    const allData = await db.all();

    // 2. Check if any existing entry has this user's ID as the ownerId
    const existingEntry = allData.find(item => 
        item.id.startsWith("key_") && item.value.ownerId === userId
    );

    // 3. IF FOUND: Send the existing key and STOP the function
    if (existingEntry) {
        const keyName = existingEntry.id.replace("key_", "");
        const status = existingEntry.value.hwid ? "Locked to a PC" : "Not yet used";
        
        return message.reply(`**You already have a key!**\nKey: \`${keyName}\`\nStatus: \`${status}\``);
    }

    // 4. IF NOT FOUND: Proceed to generate the new key
    const newKey = "GT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    await db.set(`key_${newKey}`, { 
        hwid: null, 
        owner: message.author.tag,
        ownerId: userId 
    });

    return message.reply(`**Key Generated!**\nKey: \`${newKey}\`\n*This key will lock to the first computer that uses it.*`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
client.login(process.env.TOKEN);


