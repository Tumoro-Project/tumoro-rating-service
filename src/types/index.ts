export enum UserRole {
    TALENT = 'talent',
    RECRUITER = 'recruiter',
    REVIEWER = 'reviewer',
    ADMIN = 'admin',
}

export interface JwtPayload {
    userId?: string;
    email?: string;
    role?: UserRole;
    serviceName?: string;
    type?: 'access' | 'refresh' | 'service';
}
