import "./navigation.js";
import { getAuth } from "../identity/index.js";
import { mountAdmin } from "../admin/index.js";
mountAdmin(await getAuth().catch(() => null));
