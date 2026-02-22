export type PlanType = 'FREE' | 'PRO';

export interface JwtPayload {
    sub: string;
    email: string;
    planType: PlanType;
}
