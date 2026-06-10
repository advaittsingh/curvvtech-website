# RDS (Postgres) — checklist

- Create a **PostgreSQL** instance in the same VPC as ECS (or peered).
- Security group: allow inbound **5432** from the ECS task security group only.
- Set `DATABASE_URL` on the API task (Secrets Manager or SSM), e.g.  
  `postgresql://user:pass@your-rds-host:5432/followup?sslmode=require`
- Run migrations from CI or a one-off task:  
  `npm run migrate -w @curvvtech/api`
