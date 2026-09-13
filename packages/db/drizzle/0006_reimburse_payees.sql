CREATE TABLE "reimburse_payees" (
	"guild_id" varchar(20) NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"account_name" varchar(120) NOT NULL,
	"bank_code" varchar(20) NOT NULL,
	"account_number" varchar(34) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reimburse_payees_guild_id_user_id_pk" PRIMARY KEY("guild_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "reimburse_claims" ADD COLUMN "payee_name" varchar(120);--> statement-breakpoint
ALTER TABLE "reimburse_claims" ADD COLUMN "payee_bank_code" varchar(20);--> statement-breakpoint
ALTER TABLE "reimburse_claims" ADD COLUMN "payee_account_number" varchar(34);