module.exports = {
    name: 'announce',
    description: 'Posts the official PuffinBot announcement.',
    adminOnly: true,
    async execute(message, args) {
        const announceEmbed = {
            title: "📜 ANNOUNCEMENT: THE QUEEN'S LITTLE DEVICE HAS ARRIVED!",
            color: 0xffd700, 
            description: "###  Hear ye! Hear ye! @everyone\n\nBy decree of the Glorious Leader, **Fortuna Felis**, the PuffinBot is now officially online! 🤖⚔️\n\nOur Boss Finals sign-up system has been upgraded! A small, diligent mechanism now sits beside the throne, keeping the register. Whether you seek the top Puffin Boss Team or offer your strength as a Reserve, the Queen’s little mechanism is active. Do try to behave!\n",
            fields: [
                { name: "🛡️ How to Join", value: "Click the boss buttons below to register. You will be asked for your status and a personal and suitably Puffin-like message for our Queen!" },
                { name: "😴 Lazy Option", value: "Feeling uninspired? Use the Lazy Option message, but be warned the Queen may not approve!" },
                { name: "🏃 Dropping Out", value: "Should cowardice take hold, use the 'Drop Out' button or type `!dropout`." }
            ],
            footer: { text: "👑 Hail Pufffin Dragons! Long live the Queen! | Powered by PuffinBot" }
        };
        await message.channel.send({ embeds: [announceEmbed] });
        message.delete().catch(() => {});
    },
};
