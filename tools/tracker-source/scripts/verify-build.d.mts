export function verifyBuild(root: string): Promise<{sourceCommit:string;sourceTree:string;files:Record<string,string>;dirty:boolean}>;
