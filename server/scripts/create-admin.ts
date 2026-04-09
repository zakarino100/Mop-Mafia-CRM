import { supabase, supabaseEnabled } from "../supabase";
import { db } from "../db";
import { admins } from "../../shared/schema";
import { eq } from "drizzle-orm";

async function createAdmin() {
  if (!supabaseEnabled || !supabase) {
    console.error("Supabase is not configured");
    process.exit(1);
  }

  const email = "nicole@mop-mafia.com";
  const password = "mopmafia25!";

  try {
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      // Check if user already exists
      if (error.message.includes("already been registered")) {
        console.log("User already exists in Supabase Auth, checking admins table...");
        
        // Get existing user
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        
        const existingUser = users.find(u => u.email === email);
        if (!existingUser) {
          throw new Error("Could not find existing user");
        }
        
        // Check if already in admins table
        const existing = await db.select().from(admins).where(eq(admins.adminId, existingUser.id));
        if (existing.length > 0) {
          console.log("Admin already exists:", email);
          process.exit(0);
        }
        
        // Add to admins table
        await db.insert(admins).values({
          adminId: existingUser.id,
          email: email,
          role: "admin",
        });
        
        console.log("Added existing user to admins table:", email);
        process.exit(0);
      }
      throw error;
    }

    if (!data.user) {
      throw new Error("Failed to create user");
    }

    // Add to admins table
    await db.insert(admins).values({
      adminId: data.user.id,
      email: email,
      role: "admin",
    });

    console.log("Successfully created admin:", email);
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
}

createAdmin();
