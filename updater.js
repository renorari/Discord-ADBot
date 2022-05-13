const fs = require("fs");
const cp = require("child_process");
require("dotenv").config();
const github_handler = require("github-webhook-handler")({ path: "/adbot_github", secret: process.env.github_secret });
github_handler.on("push", () => {
    try {
        fs.unlinkSync("package-lock.json");
    } catch (error) {
        console.error(error);
    }
    cp.execSync("chown -hR renorari:renorari /home/renorari/Discord-ADBot");
    cp.execSync("sudo -u renorari git pull");
    cp.execSync("npm install");
    process.exit();
});

module.exports = {
    "githubHandler": github_handler
};