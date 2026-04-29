/** Eski davranış: düz HTTP (mobilde "güvenli değil" uyarısı normal). */
process.env.DEV_USE_HTTP = "1";
require("./run-dev-lan.cjs");
