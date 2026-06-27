import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(root, '.env') });

const envFile = `.env.${process.env.NODE_ENV}`;
const envPath = path.join(root, envFile);
dotenv.config({ path: envPath, override: true });
