import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  sassOptions: {
    includePaths: [path.join(process.cwd(), "node_modules")],
    // Carbon still uses a few Sass APIs Dart Sass warns about. The warnings are
    // upstream and not actionable here, so they are silenced to keep builds readable.
    silenceDeprecations: ["mixed-decls", "global-builtin", "import", "legacy-js-api", "slash-div"],
  },
};

export default nextConfig;
