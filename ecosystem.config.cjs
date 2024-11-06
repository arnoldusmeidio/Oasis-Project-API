module.exports = {
    apps: [
        {
            namespace: "Oasis Project",
            name: "api",
            script: "npm run serve",
            cwd: "./api",
            watch: ".",
        },
        // {
        //    namespace: "Oasis Project",
        //    name: "database",
        //    script: "npx prisma studio",
        //    cwd: "./api",
        //    watch: ".",
        // },
    ],
};
