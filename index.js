const wait = require("timers/promises").setTimeout;
const {
    Client,
    Intents,
    MessageEmbed,
    MessageActionRow,
    MessageButton
} = require("discord.js");
const {
    REST
} = require("@discordjs/rest");
const {
    Routes
} = require("discord-api-types/v9");
const {
    SlashCommandBuilder,
    ContextMenuCommandBuilder
} = require("@discordjs/builders");
const mysql = require("mysql2");
const {
    ApplicationCommandType
} = require("discord-api-types/v10");
require("dotenv").config();
const db = mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUser,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase
});
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});
const restClient = new REST({
    version: "10"
}).setToken(process.env.botToken);
client.login(process.env.botToken);
db.connect();

process.on("uncaughtException", (error) => {
    console.error(error);
    client.channels.cache.get("972743114676658196").send({
        content: "エラー",
        embeds: [
            new MessageEmbed()
                .setTitle("エラー")
                .setDescription(error.message)
                .setColor(15548997)
        ],
        components: []
    });
});

function dbPing() {
    return new Promise((resolve, reject) => {
        var st = new Date();
        db.ping((error) => {
            if (error) {
                reject(error);
            } else {
                resolve(new Date() - st);
            }
        });
    });
}
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
        "activities": [{
            "name": `adbot.renorari.net | /help | ${client.guilds.cache.size}servers`,
            "type": "STREAMING",
            "url": "https://www.youtube.com/watch?v=yTqqXM8-AyI&list=UU3FhTjQlRrPohRShkyjZlhA"
        }]
    });

    await restClient.put(
        Routes.applicationCommands(client.user.id), {
            body: commands
        },
    );
    await restClient.put(
        Routes.applicationGuildCommands(client.user.id, "971704400588443658"), {
            body: [
                new ContextMenuCommandBuilder()
                    .setName("広告として追加")
                    .setType(ApplicationCommandType.Message),
                new SlashCommandBuilder()
                    .setName("remove")
                    .setDescription("広告を削除")
                    .addStringOption((option) =>
                        option
                            .setName("ad-id")
                            .setRequired(true)
                            .setDescription("AD-IDを入力してください")
                    )
            ]
        },
    );
});

client.on("interactionCreate", async interaction => {
    if (interaction.isCommand()) {
        await interaction.deferReply();
        if (interaction.commandName == "status") {
            await interaction.editReply({
                embeds: [
                    new MessageEmbed()
                        .setTitle("ステータス")
                        .setDescription("ステータスに問題がある場合は、開発者へお問い合わせください")
                        .setColor(5763719)
                        .setFields([{
                            name: "Bot Websocket",
                            value: `${client.ws.ping}㍉秒`
                        },
                        {
                            name: "Database Server",
                            value: `${await dbPing()}㍉秒`
                        }
                        ])
                ]
            });
        } else if (interaction.commandName == "invite") {
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
        } else if (interaction.commandName == "remove") {
            if (interaction.options.getString("ad-id", true).split(".")[0] == interaction.member.user.id) {
                db.query(`delete from ads where adId='${interaction.options.getString("ad-id", true)}';`, async (error) => {
                    if (error) {
                        return interaction.editReply({
                            content: "エラー",
                            embeds: [
                                new MessageEmbed()
                                    .setTitle("エラー")
                                    .setDescription(error.message)
                                    .setColor(15548997)
                            ],
                            components: []
                        });
                    }
                    await interaction.editReply({
                        content: "削除しました",
                        embeds: [
                            new MessageEmbed()
                                .setTitle("削除しました")
                                .setColor(5763719)
                        ]
                    });
                    await wait(5000);
                    await interaction.deleteReply();
                });
            } else {
                return interaction.editReply({
                    content: "エラー",
                    embeds: [
                        new MessageEmbed()
                            .setTitle("エラー")
                            .setDescription("あなたの広告ではありません")
                            .setColor(15548997)
                    ],
                    components: []
                });
            }
        } else if (interaction.commandName == "view") {
            db.query("select * from ads", async (error, result) => {
                if (error) {
                    return interaction.editReply({
                        content: "エラー",
                        embeds: [
                            new MessageEmbed()
                                .setTitle("エラー")
                                .setDescription(error.message)
                                .setColor(15548997)
                        ],
                        components: []
                    });
                }
                const ad = result[Math.floor(Math.random() * result.length)];
                await interaction.editReply({
                    embeds: [
                        new MessageEmbed()
                            .setTitle(`${ad.userTag}さんの広告`)
                            .setColor(5793266)
                            .setDescription(ad.text)
                            .setFooter({
                                text: `AD-ID: ${ad.adId}`
                            })
                    ]
                });
            });
        }
    } else if (interaction.isMessageContextMenu()) {
        await interaction.deferReply();
        if (interaction.commandName == "広告として追加") {
            if (interaction.targetMessage.author.id != interaction.member.id) {
                return interaction.editReply({
                    content: "エラー",
                    embeds: [
                        new MessageEmbed()
                            .setTitle("エラー")
                            .setDescription("あなたのメッセージではありません")
                            .setColor(15548997)
                    ],
                    components: []
                });
            }
            const isAdded = await new Promise((resolve) => {
                db.query("select * from ads", (error, result) => {
                    if (error) throw error;
                    if (result.map((ad) => ad.adId == `${interaction.targetMessage.author.id}.${interaction.targetMessage.id}`).length) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });
            });
            if (isAdded) {
                return interaction.editReply({
                    content: "エラー",
                    embeds: [
                        new MessageEmbed()
                            .setTitle("エラー")
                            .setDescription("すでに広告が公開されています")
                            .setColor(15548997)
                    ],
                    components: []
                });
            }
            await interaction.editReply({
                content: "確認",
                embeds: [
                    new MessageEmbed()
                        .setTitle("広告を追加し公開します")
                        .setDescription("よろしいですか?")
                        .setColor(16705372)
                        .setFields([{
                            "name": "公開する広告",
                            "value": interaction.targetMessage.content
                        },
                        {
                            "name": "AD-ID",
                            "value": `${interaction.targetMessage.author.id}.${interaction.targetMessage.id}`
                        },
                        ])
                ],
                components: [
                    new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setCustomId("addad_yes")
                                .setStyle("DANGER")
                                .setLabel("公開")
                        )
                        .addComponents(
                            new MessageButton()
                                .setCustomId("cancel")
                                .setStyle("PRIMARY")
                                .setLabel("キャンセル")
                        )
                ]
            });
        }
    } else if (interaction.isButton()) {
        await interaction.deferUpdate();
        if (interaction.customId == "addad_yes") {
            db.query("insert into ads SET ?;", {
                text: interaction.message.embeds[0].fields[0].value,
                adId: interaction.message.embeds[0].fields[1].value,
                userId: interaction.member.user.id,
                userTag: interaction.member.user.tag,
                msgId: interaction.message.embeds[0].fields[1].value.split(".")[1]
            }, async (error) => {
                if (error) {
                    return interaction.editReply({
                        content: "エラー",
                        embeds: [
                            new MessageEmbed()
                                .setTitle("エラー")
                                .setDescription(error.message)
                                .setColor(15548997)
                        ],
                        components: []
                    });
                }
                await interaction.editReply({
                    content: "公開しました!",
                    embeds: [
                        new MessageEmbed()
                            .setTitle("公開しました")
                            .setColor(5763719)
                            .setFields([{
                                "name": "広告",
                                "value": interaction.message.embeds[0].fields[0].value
                            },
                            {
                                "name": "AD-ID",
                                "value": interaction.message.embeds[0].fields[1].value
                            },
                            ])
                    ],
                    components: []
                });
                await client.channels.cache.get("972704702766678056").send({
                    content: "この広告は安全ですか?",
                    embeds: [
                        new MessageEmbed()
                            .setTitle("安全ですか?")
                            .setDescription("この広告が安全かどうか、確認してください")
                            .setColor(16705372)
                            .setFields([{
                                "name": "公開された広告",
                                "value": interaction.message.embeds[0].fields[0].value
                            },
                            {
                                "name": "AD-ID",
                                "value": interaction.message.embeds[0].fields[1].value
                            },
                            ])
                    ],
                    components: [
                        new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setCustomId("check_good")
                                    .setStyle("SUCCESS")
                                    .setLabel("安全")
                            )
                            .addComponents(
                                new MessageButton()
                                    .setCustomId("check_bad")
                                    .setStyle("DANGER")
                                    .setLabel("削除")
                            )
                    ]
                });
            });
        } else if (interaction.customId == "cancel") {
            await interaction.message.edit({
                content: "キャンセルしました",
                embeds: [],
                components: []
            });
            await wait(5000);
            await interaction.message.delete();
        } else if (interaction.customId == "check_good") {
            await interaction.editReply({
                content: "安全とマークしました",
                embeds: [],
                components: []
            });
            await wait(5000);
            await interaction.message.delete();
        } else if (interaction.customId == "check_bad") {
            db.query(`delete from ads where adId='${interaction.message.embeds[0].fields[1].value}';`, async (error) => {
                if (error) {
                    return interaction.editReply({
                        content: "エラー",
                        embeds: [
                            new MessageEmbed()
                                .setTitle("エラー")
                                .setDescription(error.message)
                                .setColor(15548997)
                        ],
                        components: []
                    });
                }
                await interaction.editReply({
                    content: "削除しました",
                    embeds: [
                        new MessageEmbed()
                            .setTitle("削除しました")
                            .setColor(5763719)
                    ],
                    components: []
                });
                await wait(5000);
                await interaction.deleteReply();
            });
        }
    }
});

client.on("messageCreate", (message) => {
    if (message.author.id == client.user.id) return;
    if (Math.random() < 0.1) {
        db.query("select * from ads", (error, result) => {
            if (error) throw error;
            const ad = result[Math.floor(Math.random() * result.length)];
            message.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`${ad.userTag}さんの広告`)
                        .setURL(`https://discord.com/users/${ad.userId}`)
                        .setColor(5793266)
                        .setDescription(ad.text)
                        .setFooter({
                            text: `AD-ID: ${ad.adId}`
                        })
                ]
            });
        });
    }
});