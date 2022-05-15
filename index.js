// Path
const path = require("path");
// wait function
const wait = require("timers/promises").setTimeout;
// node-fetch
const fetch = require("node-fetch");
// Hapi
const Hapi = require("@hapi/hapi");
const Inert = require("@hapi/inert");
// Discord.js
const {
    Client,
    Intents,
    MessageEmbed,
    MessageActionRow,
    MessageButton
} = require("discord.js");
// Rest Discord.js
const {
    REST
} = require("@discordjs/rest");
// DiscordAPI(v10) Types
const {
    Routes,
    ApplicationCommandType
} = require("discord-api-types/v10");
// Discord.js Builders
const {
    SlashCommandBuilder,
    ContextMenuCommandBuilder
} = require("@discordjs/builders");
// MySQL
const mysql = require("mysql2");
// load updater
const { githubHandler } = require("./updater");
// load .env
require("dotenv").config();
// create connnection to database
const db = mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUser,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase
});
// create DiscordBot clinet
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});
// create Rest Discord client
const restClient = new REST({
    version: "10"
}).setToken(process.env.botToken);
// DiscordBot client login
client.login(process.env.botToken);
// connect to Databese
db.connect();

// error handler
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

// ping db
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
// commands
const commands = [
    new SlashCommandBuilder()
        .setName("status")
        .setDescription("ステータスを確認"),
    new SlashCommandBuilder()
        .setName("view")
        .setDescription("広告を見る")
        .addStringOption((option) =>
            option
                .setName("ad-id")
                .setDescription("AD-IDを入力してください")
        ),
    new SlashCommandBuilder()
        .setName("invite")
        .setDescription("招待リンクを表示")
];

// ready
client.on("ready", async () => {
    console.log(`${client.user.tag}にログインしました`);

    // set status
    client.user.setPresence({
        "status": "online",
        "activities": [{
            "name": `adbot.renorari.net | /help | ${client.guilds.cache.size}servers`,
            "type": "STREAMING",
            "url": "https://www.youtube.com/watch?v=yTqqXM8-AyI&list=UU3FhTjQlRrPohRShkyjZlhA"
        }]
    });
    setInterval(() => {
        client.user.setPresence({
            "status": "online",
            "activities": [{
                "name": `adbot.renorari.net | /help | ${client.guilds.cache.size}servers`,
                "type": "STREAMING",
                "url": "https://www.youtube.com/watch?v=yTqqXM8-AyI&list=UU3FhTjQlRrPohRShkyjZlhA"
            }]
        });
    }, 60000);

    // set commands
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
                    ),
                new SlashCommandBuilder()
                    .setName("list")
                    .setDescription("広告を確認します")
                    .addUserOption((option) =>
                        option
                            .setName("user")
                            .setDescription("ユーザーを入力してください")
                    ),
                new SlashCommandBuilder()
                    .setName("maxads")
                    .setDescription("残りの広告枠を確認します")
                    .addUserOption((option) =>
                        option
                            .setName("user")
                            .setDescription("ユーザーを入力してください")
                    )
            ]
        },
    );
});

// interaction
client.on("interactionCreate", async interaction => {
    // commands
    if (interaction.isCommand()) {
        await interaction.deferReply();
        if (interaction.commandName == "status") {// status
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
        } else if (interaction.commandName == "invite") {// invite
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
        } else if (interaction.commandName == "remove") {// remove
            if (interaction.options.getString("ad-id", true).split(".")[0] != interaction.member.user.id && !interaction.member.roles.cache.has("971706193208811610")) {
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
        } else if (interaction.commandName == "view") {// view
            db.query(`select * from ads${(interaction.options.getString("ad-id")) ? ` where adId='${interaction.options.getString("ad-id")}'` : ""};`, async (error, result) => {
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
        } else if (interaction.commandName == "list") {
            const user = (interaction.options.getUser("user")) ? interaction.options.getUser("user") : interaction.member.user;
            db.query(`select * from ads where userId='${user.id}'`, async (error, result) => {
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
                if (result.length != 0) {
                    await interaction.editReply({
                        embeds: [
                            new MessageEmbed()
                                .setTitle(`${user.tag}さんの広告リスト`)
                                .setColor(5793266)
                                .setDescription(`**${result.length}個の広告があります**\n\n${result.map((ad) => `AD-ID: ${ad.adId}`).join("\n")}`)
                        ]
                    });
                } else {
                    await interaction.editReply({
                        embeds: [
                            new MessageEmbed()
                                .setTitle(`${user.tag}さんの広告`)
                                .setColor(5793266)
                                .setDescription(`${user.tag}さんは広告を公開していません`)
                        ]
                    });
                }
            });
        } else if (interaction.commandName == "maxads") {
            const user = (interaction.options.getUser("user")) ? interaction.options.getUser("user") : interaction.member.user;
            db.query(`select * from ads where userId='${user.id}'`, async (error, result) => {
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
                db.query(`select * from maxads where userId='${interaction.member.user.id}'`, async (error, _result) => {
                    if (_result.length == 0) {
                        db.query("insert into maxads SET ?;", {
                            userId: interaction.member.user.id,
                            userTag: interaction.member.user.tag,
                            maxAds: 2
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

                        });
                    } else {
                        await interaction.editReply({
                            embeds: [
                                new MessageEmbed()
                                    .setTitle(`${user.tag}さんの広告枠`)
                                    .setColor(5793266)
                                    .setDescription(`${_result[0].maxAds}枠中${result.length}枠(${Math.floor(result.length / Math.floor(_result[0].maxAds) * 1000) / 10}%)使用中`)
                            ]
                        });
                    }
                });
            });
        }
    } else if (interaction.isMessageContextMenu()) {
        await interaction.deferReply();
        if (interaction.commandName == "広告として追加") {// add ad
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
                db.query(`select * from ads where adId='${interaction.targetMessage.author.id}.${interaction.targetMessage.id}'`, (error, result) => {
                    if (error) throw error;
                    if (result.length) {
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
        if (interaction.customId == "addad_yes") {// confirm to add ad
            db.query(`select * from ads where userId='${interaction.member.user.id}'`, async (error, result) => {
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
                db.query(`select * from maxads where userId='${interaction.member.user.id}'`, async (error, _result) => {
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

                    if (_result.length != 0 && result.length >= _result[0].maxAds) {
                        return interaction.editReply({
                            content: "エラー",
                            embeds: [
                                new MessageEmbed()
                                    .setTitle("エラー")
                                    .setDescription("最大広告数を超えています\n広告を削除してからもう一度実行してください")
                                    .setColor(15548997)
                            ],
                            components: []
                        });
                    } else {
                        if (_result.length == 0) {
                            db.query("insert into maxads SET ?;", {
                                userId: interaction.member.user.id,
                                userTag: interaction.member.user.tag,
                                maxAds: 2
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
                            });
                        }
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
                                            name: "広告",
                                            value: interaction.message.embeds[0].fields[0].value
                                        },
                                        {
                                            name: "AD-ID",
                                            value: interaction.message.embeds[0].fields[1].value
                                        }
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
                                            name: "公開された広告",
                                            value: interaction.message.embeds[0].fields[0].value
                                        },
                                        {
                                            name: "AD-ID",
                                            value: interaction.message.embeds[0].fields[1].value
                                        }
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
                    }
                });
            });
        } else if (interaction.customId == "cancel") {// cancel
            await interaction.message.edit({
                content: "キャンセルしました",
                embeds: [],
                components: []
            });
            await wait(5000);
            await interaction.message.delete();
        } else if (interaction.customId == "check_good") {// good ad
            await interaction.editReply({
                content: "安全とマークしました",
                embeds: [],
                components: []
            });
            await wait(5000);
            await interaction.message.delete();
        } else if (interaction.customId == "check_bad") {// bad ad
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

// message
client.on("messageCreate", (message) => {
    if (message.author.id == client.user.id) return;
    if (Math.random() < 0.05) {
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

/* ======================================== */
/* ============以下ウェブサイト============= */
/* ======================================== */

(async () => {

    const server = Hapi.server({
        port: (process.env.PORT || 1055),
        routes: {
            files: {
                relativeTo: path.join(__dirname, "public")
            }
        }
    });

    await server.register(Inert);

    server.route({
        method: "GET",
        path: "/{param*}",
        handler: {
            directory: {
                path: ".",
                redirectToSlash: true
            }
        }
    });
    server.route({
        method: "GET",
        path: "/assets/{param*}",
        handler: {
            directory: {
                path: "../assets/",
                redirectToSlash: true
            }
        }
    });
    server.route({
        method: "GET",
        path: "/api/discord_authorization/",
        handler: async (request, response) => {
            return await new Promise((resolve) => {
                fetch(" https://discordapp.com/api/oauth2/token", {
                    "method": "POST",
                    "headers": {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    "body": `client_id=${client.user.id}&client_secret=${process.env.Oauth2_secret}&grant_type=authorization_code&code=${request.query.code}&redirect_uri=https://adbot.renorari.net/api/discord_authorization/`
                }).then(res => res.json()).then(data => {
                    fetch("https://discord.com/api/users/@me", {
                        headers: {
                            Authorization: `${data.token_type} ${data.access_token}`,
                        },
                    })
                        .then(result => result.json())
                        .then(userData => {
                            const { id, username, discriminator } = userData;
                            db.query(`select * from maxads where userId='${id}'`, async (error, result) => {
                                if (error) resolve(error);
                                if (result.length == 0) {
                                    db.query("insert into maxads SET ?;", {
                                        userId: id,
                                        userTag: `${username}#${discriminator}`,
                                        maxAds: 2.5
                                    }, async (error) => {
                                        if (error) resolve(error);
                                        resolve(response.redirect("https://discord.com/oauth2/authorized"));
                                    });
                                } else {
                                    db.query(`update from maxads where userId=${id} SET ?;`, {
                                        userId: id,
                                        userTag: `${username}#${discriminator}`,
                                        maxAds: result[0].maxAds + 0.5
                                    }, async (error) => {
                                        if (error) resolve(error);
                                        resolve(response.redirect("https://discord.com/oauth2/authorized"));
                                    });
                                }
                            });
                        });
                });
            });
        }
    });
    server.route({
        method: "*",
        path: "/adbot_github",
        handler: (res) => {
            return githubHandler(res);
        }
    });
    server.route({
        method: "GET",
        path: "/invite",
        handler: ((res, req) => req.redirect(process.env.inviteLink))
    });

    await server.start();
    console.log("Server running on %s", server.info.uri);
})();
