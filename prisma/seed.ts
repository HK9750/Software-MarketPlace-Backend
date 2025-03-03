import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma";
import { generateTokens } from "../src/controllers/auth-controller";

async function seedSuperAdmin() {
    try {
        const userCount = await prisma.user.count();

        if (userCount === 0) {
            const hashedPassword = await bcrypt.hash("Abc!23", 12);

            const superAdmin = await prisma.user.create({
                data: {
                    email: "admin@gmail.com",
                    username: "superadmin",
                    password: hashedPassword,
                    role: "ADMIN",
                },
            });
            console.log(superAdmin);

            const { accessToken, refreshToken } = generateTokens(superAdmin.id);
            console.log("🔑 Access Token:", accessToken);
            console.log("🔑 Refresh Token:", refreshToken);


            console.log("✅ SuperAdmin seeded successfully.");
        } else {
            console.log("⚡ Users already exist. Skipping SuperAdmin seeding.");
        }
    } catch (error) {
        console.error("❌ Error seeding SuperAdmin:", error);
    } finally {
        await prisma.$disconnect();
    }
}

seedSuperAdmin();
