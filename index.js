const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { SlashCommandBuilder } = require("@discordjs/builders");
require("dotenv").config();
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const restClient = new REST({ version: "9" }).setToken(process.env.botToken);
client.login(process.env.botToken);

const commands = [
    new SlashCommandBuilder()
        .setName("status")
        .setDescription("ステータスを確認"),
    new SlashCommandBuilder()
        .setName("view")
        .setDescription("広告を見る"),
    new SlashCommandBuilder()
        .setName("invite")
        .setDescription("招待リンクを表示")
];

client.on("ready", async () => {
    console.log(`${client.user.tag}にログインしました`);

    client.user.setPresence({
        "status": "online",
        "activities": [
            {
                "name": `adbot.renorari.net | /help | ${client.guilds.cache.size}servers`,
                "type": "STREAMING",
                "url": "https://www.youtube.com/watch?v=yTqqXM8-AyI&list=UU3FhTjQlRrPohRShkyjZlhA"
            }
        ]
    });

    await restClient.put(
        Routes.applicationCommands(client.user.id),
        { body: commands },
    );
    await restClient.put(
        Routes.applicationGuildCommands(client.user.id, "971704400588443658"),
        {
            body: [
                new SlashCommandBuilder()
                    .setName("add")
                    .setDescription("広告を追加")
                    .addAttachmentOption((option) =>
                        option
                            .setName("テキストファイル")
                            .setDescription("広告のテキストファイルを指定してください")
                            .setRequired(true)
                    )
            ]
        },
    );
});

client.on("interactionCreate", async interaction => {
    if (interaction.isCommand()) {
        await interaction.deferReply();
        if (interaction.commandName === "status") {
            await interaction.editReply({
                embeds: [
                    new MessageEmbed()
                        .setTitle("ステータス")
                        .setDescription("ステータスに問題がある場合は、開発者へお問い合わせください")
                        .setFields([
                            {
                                name: "Bot Websocket",
                                value: `${client.ws.ping}㍉秒`
                            }
                        ])
                ]
            });
        } else if (interaction.commandName === "invite") {
            await interaction.editReply({
                content: "どうぞ!",
                components: [
                    new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setLabel("サーバーに追加")
                                .setStyle("LINK")
                                .setURL(process.env.inviteLink)
                        )
                ]
            });
        }
    }
});
