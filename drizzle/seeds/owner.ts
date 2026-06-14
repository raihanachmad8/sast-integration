import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import * as schema from '../schema';
import { AUTH } from '../../src/server/modules/auth/constants';
import { OWNER_DEFAULTS } from './constants';
import type { SeedModule } from './index';

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? OWNER_DEFAULTS.EMAIL;
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? OWNER_DEFAULTS.PASSWORD;
const OWNER_NAME = process.env.OWNER_NAME ?? OWNER_DEFAULTS.NAME;

/** Seeds the bootstrap owner user. Always runs. Stores id in ctx for downstream modules. */
export const ownerSeed: SeedModule = {
  name: 'owner',
  description: 'Bootstrap owner user',
  shouldRun: () => true,
  async run({ db, state }) {
    const passwordHash = await hash(OWNER_PASSWORD, AUTH.SALT_ROUNDS);
    const [created] = await db
      .insert(schema.users)
      .values({ email: OWNER_EMAIL, passwordHash, name: OWNER_NAME, emailVerifiedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.users.email,
        set: { passwordHash, name: OWNER_NAME, emailVerifiedAt: new Date() },
      })
      .returning();

    const owner = created ?? (await db.select().from(schema.users).where(eq(schema.users.email, OWNER_EMAIL)).limit(1))[0];
    state.ownerUserId = owner?.id;

    return created ? `created ${OWNER_EMAIL}` : `${OWNER_EMAIL} already exists`;
  },
};
