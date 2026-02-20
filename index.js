const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const app = express();

app.use(express.urlencoded({ extended: true }));

app.post('/verify', async (req, res) => {
    const { key, hwid } = req.body;
    
    const keyData = await db.get(`key_${key}`);

    if (!keyData) {
        return res.send("INVALID");
    }

    if (!keyData.hwid) {
        await db.set(`key_${key}`, { ...keyData, hwid: hwid });
        return res.send("SUCCESS");
    }

    if (keyData.hwid === hwid) {
        return res.send("SUCCESS");
    } else {
        return res.send("HWID_MISMATCH");
    }
});

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'genkey') {
        const newKey = "GT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        
        await db.set(`key_${newKey}`, { hwid: null, owner: interaction.user.tag });
        
        await interaction.reply(`Key generated: \`${newKey}\` (Locked to first user)`);
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`API is live at: http://localhost:${PORT}/verify`));

client.login('MTM3MTMwMzUxMDQ2MDczMTQ4Mw.GFMNZi.M-86dg3qlb9b1K1bvgoDTOB3ipqOUnkv_Qqsio');
