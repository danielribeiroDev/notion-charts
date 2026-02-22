import { plainToInstance } from 'class-transformer';
import { validateSync, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { MetricConfigDto } from '../../notion-integration/dto/aggregate-metric.dto';

@ValidatorConstraint({ name: 'ConfigJsonMetricsConstraint', async: false })
export class ConfigJsonMetricsConstraint implements ValidatorConstraintInterface {
    validate(value: unknown): boolean {
        if (value === null || value === undefined) return false;
        if (typeof value !== 'object' || Array.isArray(value)) return false;

        const metrics = (value as Record<string, unknown>).metrics;
        if (metrics === undefined) return true;
        if (!Array.isArray(metrics)) return false;
        if (!metrics.length) return true;

        for (const metric of metrics) {
            const instance = plainToInstance(MetricConfigDto, metric);
            const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: true });
            if (errors.length) return false;
        }

        return true;
    }

    defaultMessage(): string {
        return 'configJson.metrics must be an array of valid metric configs';
    }
}
