import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Ivy Wallet database...");

  // 1. Initialize Settings if not exists
  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    await prisma.settings.create({
      data: {
        theme: "DARK",
        currency: "USD",
        bufferAmount: 0.0,
        name: "My Ivy Wallet",
        firstDayOfWeek: 1,
        hideBalance: false,
      },
    });
    console.log("Created default settings.");
  }

  // 2. Initialize Default Accounts
  const accountCount = await prisma.account.count();
  if (accountCount === 0) {
    const cash = await prisma.account.create({
      data: {
        name: "Cash",
        currency: "USD",
        color: "#12B880",
        icon: "banknote",
        orderNum: 1.0,
        includeInBalance: true,
      },
    });

    const bank = await prisma.account.create({
      data: {
        name: "Bank Account",
        currency: "USD",
        color: "#3193F5",
        icon: "landmark",
        orderNum: 2.0,
        includeInBalance: true,
      },
    });

    const savings = await prisma.account.create({
      data: {
        name: "Savings",
        currency: "USD",
        color: "#5C3DF5",
        icon: "piggy-bank",
        orderNum: 3.0,
        includeInBalance: true,
      },
    });

    console.log("Created default accounts.");

    // 3. Initialize Default Categories
    const categories = [
      { name: "Food & Drinks", color: "#F57A3D", icon: "utensils", orderNum: 1.0 },
      { name: "Groceries", color: "#12B880", icon: "shopping-cart", orderNum: 2.0 },
      { name: "Shopping", color: "#F53D99", icon: "shopping-bag", orderNum: 3.0 },
      { name: "Transportation", color: "#3193F5", icon: "car", orderNum: 4.0 },
      { name: "Housing & Bills", color: "#5C3DF5", icon: "home", orderNum: 5.0 },
      { name: "Entertainment", color: "#F5D018", icon: "gamepad-2", orderNum: 6.0 },
      { name: "Health & Fitness", color: "#10A372", icon: "heart-pulse", orderNum: 7.0 },
      { name: "Education", color: "#4D33CC", icon: "graduation-cap", orderNum: 8.0 },
      { name: "Salary", color: "#12B880", icon: "briefcase", orderNum: 9.0 },
      { name: "Investments", color: "#3193F5", icon: "trending-up", orderNum: 10.0 },
      { name: "Gifts", color: "#E11D48", icon: "gift", orderNum: 11.0 },
      { name: "Other", color: "#74747A", icon: "circle-dot", orderNum: 12.0 },
    ];

    const createdCats: Record<string, string> = {};
    for (const cat of categories) {
      const c = await prisma.category.create({
        data: cat,
      });
      createdCats[cat.name] = c.id;
    }
    console.log("Created default categories.");

    // 4. Create sample initial transactions so user has a rich experience immediately
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    await prisma.transaction.createMany({
      data: [
        {
          accountId: bank.id,
          type: "INCOME",
          amount: 3500.0,
          title: "Monthly Salary",
          description: "Full-time software engineering salary",
          categoryId: createdCats["Salary"],
          dateTime: threeDaysAgo,
        },
        {
          accountId: bank.id,
          type: "EXPENSE",
          amount: 85.5,
          title: "Weekly Grocery Run",
          description: "Supermarket supplies and fresh produce",
          categoryId: createdCats["Groceries"],
          dateTime: yesterday,
        },
        {
          accountId: cash.id,
          type: "EXPENSE",
          amount: 14.25,
          title: "Coffee & Pastry",
          description: "Morning artisan latte",
          categoryId: createdCats["Food & Drinks"],
          dateTime: now,
        },
        {
          accountId: bank.id,
          type: "TRANSFER",
          amount: 500.0,
          toAccountId: savings.id,
          toAmount: 500.0,
          title: "Monthly Savings Allocation",
          dateTime: yesterday,
        },
      ],
    });

    // 5. Create a sample budget
    await prisma.budget.create({
      data: {
        name: "Food & Dining Budget",
        amount: 300.0,
        categoryIds: JSON.stringify([createdCats["Food & Drinks"], createdCats["Groceries"]]),
        period: "MONTHLY",
        orderId: 1.0,
      },
    });

    console.log("Sample transactions and budget seeded.");
  }

  console.log("Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
