import site from '../../site.config';
export function qaConnection() {
 const connection=process.env.DATABASE_URL_UNPOOLED;
 if(!connection || !new URL(connection).hostname.startsWith(site.qa.database.hostPrefix) || process.env.NEON_BRANCH!==site.qa.database.branchName) throw new Error('Expected the explicitly configured isolated QA owner connection');
 return connection;
}
