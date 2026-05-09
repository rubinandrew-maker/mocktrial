/**
 * Seeding script — populates all 14 movement categories and their levels
 * into the emileworkout Firestore project.
 *
 * Run:
 *   npm install firebase
 *   node seed/seed.mjs
 *
 * Requires Firestore rules to allow writes (temporarily set to open, or deploy
 * the rules in firestore.rules first with test mode).
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDDHct1gEr_U_Xpl7lK2H695medrt6SxLI",
  authDomain: "emileworkout.firebaseapp.com",
  projectId: "emileworkout",
  storageBucket: "emileworkout.firebasestorage.app",
  messagingSenderId: "165724051204",
  appId: "1:165724051204:web:6b4bd0828787cec4442251",
  measurementId: "G-V0V1RSFPCH",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------------------------------------------------------------------
// Movement categories and levels — sourced from Gym Exercise Library.xlsx
// ---------------------------------------------------------------------------

const MOVEMENTS = [
  {
    id: "horizontal-push",
    name: "Horizontal Push",
    order: 1,
    levels: [
      "Incline Pushup",
      "Pushup On Knees",
      "Pushup On Toes",
      "Decline Pushup (Low Box)",
      "Decline Pushup (Bench)",
      "TRX Pushup",
      "DB Bench Press",
      "Incline DB Bench Press",
    ],
  },
  {
    id: "vertical-push",
    name: "Vertical Push",
    order: 2,
    levels: [
      "Med Ball Shoulder Press",
      "Aquabag Shoulder Press",
      "Resistance Band Shoulder Press",
      "Wall Assisted Handstand Walk",
      "Eccentric Handstand Press (Assisted)",
      "Handstand Press Up",
      "Alternating Dumbbell Shoulder Press",
      "Half Kneeling Landmine Shoulder Press",
      "Barbell Shoulder Press",
    ],
  },
  {
    id: "horizontal-pull",
    name: "Horizontal Pull",
    order: 3,
    levels: [
      "Seated Resistance Band Row",
      "Standing Resistance Band Row (Light Resistance)",
      "TRX Australian Row",
      "TRX Feet Elevated Australian Row",
      "Feet Elevated Australian Row",
      "Feet Elevated Australian Row With Weight",
    ],
  },
  {
    id: "vertical-pull",
    name: "Vertical Pull",
    order: 4,
    levels: [
      "Resistance Band Pulldown (Small)",
      "Resistance Band Pulldown (Wide)",
      "Supported Chin Up",
      "Supported Pull Up",
      "Chin Up",
      "Pull Up",
      "Wide Pull Up",
      "Weighted Chin Up",
      "Weighted Pull Up",
      "Weighted Wide Pull Up",
    ],
  },
  {
    id: "squat",
    name: "Squat",
    order: 5,
    levels: [
      "Bodyweight Squat",
      "Medicine Ball Goblet Squat",
      "Medicine Ball Overhead Squat",
      "Aquabag Back Squat",
      "Aquabag Front Squat",
      "Aquabag Overhead Squat",
      "Kettlebell Goblet Squat",
      "Barbell Overhead Squat",
      "Barbell Front Squat",
      "Barbell Back Squat",
    ],
  },
  {
    id: "lower-body-hinge-pull",
    name: "Lower Body Hinge / Pull",
    order: 6,
    levels: [
      "Hip Thrust",
      "SL Hip Thrust",
      "Heels Elevated Hip Thrust",
      "Heels Elevated SL Hip Thrust",
      "Seated Aquabag Good Morning",
      "Aquabag Standing Good Morning (To Wall)",
      "Aquabag Good Morning",
      "Aquabag Romanian Deadlift",
      "Aquabag Deadlift",
      "Dumbbell Deadlift",
      "Dumbbell Romanian Deadlift",
      "Trapbar Deadlift",
      "Trapbar Romanian Deadlift",
      "Barbell Deadlift",
      "Barbell Romanian Deadlift",
      "Barbell B-Stance Romanian Deadlift",
    ],
  },
  {
    id: "split-leg-push",
    name: "Split Leg Exercise (Push)",
    order: 7,
    levels: [
      "Split Squat",
      "Step Up",
      "Lunge",
      "Walking Lunge",
      "Box Pistol Squat",
      "Low Box Pistol Squat",
      "Pistol Squat",
      "Front Loaded Pistol Squat",
      "Overhead Pistol Squat",
      "Weighted Lunge",
    ],
  },
  {
    // Empty in spreadsheet — placeholder for future levels
    id: "split-leg-pull",
    name: "Split Leg Exercise (Pull)",
    order: 8,
    levels: [],
  },
  {
    id: "adductors",
    name: "Adductors",
    order: 9,
    levels: [
      "Inside Foot Plank",
      "Mono Articular Copenhagen Hold",
      "Mono Articular Copenhagen Lift",
      "Bi Articular Copenhagen Hold",
      "Bi Articular Copenhagen Lift",
      "Bi Articular Copenhagen Lift (Big ROM)",
    ],
  },
  {
    id: "abductors",
    name: "Abductors",
    order: 10,
    levels: [
      "Lying Hip Abduction (Unresisted)",
      "Lying Hip Abduction (Resisted)",
      "Miniband Sidestep (Light Resistance)",
      "Miniband Sidestep (Medium Resistance)",
      "Miniband Sidestep (Heavy Resistance)",
      "Side Lunge",
      "Aquabag Side Lunge",
      "Dumbbell Side Lunge",
    ],
  },
  {
    id: "calves",
    name: "Calves",
    order: 11,
    levels: [
      "Standing Bilateral Calf Raise",
      "Standing Unilateral Calf Raise",
      "Seated Bilateral Calf Raise",
      "Seated Unilateral Calf Raise",
      "Dumbbell Weighted Bilateral Calf Raise",
      "Dumbbell Weighted Unilateral Calf Raise",
      "Safety Bar Bilateral Calf Raise",
    ],
  },
  {
    id: "core-flexion",
    name: "Core Flexion / Anti-Flexion",
    order: 12,
    levels: [
      "Crunches",
      "Raised Leg Crunches",
      "Situps",
      "Leg Raises",
      "Unilateral V-Raises",
      "Bilateral V-Raises",
      "Hanging Knee Raises",
      "Hanging Leg Raises",
      "Toes to Bar",
    ],
  },
  {
    id: "core-rotation",
    name: "Core Rotation / Anti-Rotation",
    order: 13,
    levels: [
      "Seated Russian Twist (Heels to Ground)",
      "Seated Russian Twist (Elevated Feet)",
      "Starfish Crunch",
      "Pallof Twist",
      "Keiser Low To High Core Twist",
    ],
  },
  {
    id: "core-bracing",
    name: "Core Bracing",
    order: 14,
    levels: [
      "Plank",
      "Plank Leg Switch",
      "Plank Arm Switch",
      "Plank Foot Release Hold",
      "Plank Arm Release Hold",
      "Plank Arm + Leg Switch",
      "Plank Arm + Leg Release Hold",
      "Extended Plank",
      "Extended Plank Leg Switch",
      "Extended Plank Arm Switch",
      "Extended Plank Leg Release",
      "Extended Plank Arm Release",
      "Extended Plank Arm + Leg Switch",
      "Extended Plank Arm + Leg Hold",
    ],
  },
];

const DEFAULT_TARGET_SETS = 2;
const DEFAULT_TARGET_REPS = 10;
const DEFAULT_TARGET_SESSIONS = 3;

// ---------------------------------------------------------------------------
// Seeding helpers
// ---------------------------------------------------------------------------

async function seedConfig() {
  await setDoc(doc(db, "config", "app"), {
    coachPin: "0000",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  console.log("  ✓ config/app");
}

async function seedTeams() {
  const teams = [
    { id: "team-a", name: "Team A", order: 1 },
    { id: "team-b", name: "Team B", order: 2 },
    { id: "team-c", name: "Team C", order: 3 },
  ];
  const batch = writeBatch(db);
  for (const team of teams) {
    batch.set(doc(db, "teams", team.id), {
      name: team.name,
      order: team.order,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
  console.log("  ✓ teams (3)");
}

async function seedMovements() {
  for (const movement of MOVEMENTS) {
    // Write the movement document
    await setDoc(doc(db, "movements", movement.id), {
      name: movement.name,
      order: movement.order,
      levelCount: movement.levels.length,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Write each level as a sub-document in batches of 500 (Firestore limit)
    const levels = movement.levels;
    for (let i = 0; i < levels.length; i += 499) {
      const batch = writeBatch(db);
      const chunk = levels.slice(i, i + 499);
      chunk.forEach((levelName, chunkIdx) => {
        const levelNumber = i + chunkIdx + 1;
        const levelId = `level-${String(levelNumber).padStart(2, "0")}`;
        batch.set(
          doc(db, "movements", movement.id, "levels", levelId),
          {
            levelNumber,
            name: levelName,
            description: `Level ${levelNumber} of ${movement.name}. Description coming soon.`,
            youtubeUrl: "",
            targetSets: DEFAULT_TARGET_SETS,
            targetReps: DEFAULT_TARGET_REPS,
            targetSessions: DEFAULT_TARGET_SESSIONS,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );
      });
      await batch.commit();
    }

    const levelCount = levels.length;
    console.log(
      `  ✓ movements/${movement.id} — ${levelCount} level${levelCount !== 1 ? "s" : ""}`
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding emileworkout Firestore…\n");

  console.log("config:");
  await seedConfig();

  console.log("\nteams:");
  await seedTeams();

  console.log("\nmovements + levels:");
  await seedMovements();

  console.log("\nDone. All collections seeded successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
