const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');
const { QuickDB } = require("quick.db");

const db = new QuickDB();
const app = express();
const TOKEN = process.env.TOKEN;
const CLIENT_ID = '1338040792350199849'; // <--- PUT YOUR BOT ID HERE

app.use(express.urlencoded({ extended: true }));

// --- API FOR MOD MENU ---
app.post('/verify', async (req, res) => {
    try {
        const { key, hwid } = req.body;
        const keyData = await db.get(`key_${key}`);

        if (!keyData) return res.send("INVALID");
        if (!keyData.hwid) {
            await db.set(`key_${key}`, { ...keyData, hwid: hwid });
            return res.send("SUCCESS");
        }
        if (keyData.hwid === hwid) return res.send("SUCCESS");
        return res.send("HWID_MISMATCH");
    } catch (err) {
        res.send("SERVER_ERROR");
    }
});

// --- DISCORD BOT ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Basic error handling to prevent crash
client.on('error', console.error);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API is running on port ${PORT}`);
});

if (TOKEN) {
    client.login(TOKEN).catch(console.error);
} else {
    console.log("ERROR: No TOKEN found in Environment Variables!");
}
