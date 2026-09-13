CREATE TYPE "public"."reimburse_status" AS ENUM('pending', 'submitted', 'paid', 'rejected');--> statement-breakpoint
CREATE TABLE "reimburse_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"reference" integer NOT NULL,
	"claimant_id" varchar(20) NOT NULL,
	"amount_cents" bigint NOT NULL,
	"description" text NOT NULL,
	"status" "reimburse_status" DEFAULT 'pending' NOT NULL,
	"review_message_id" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reimburse_claims_guild_reference" UNIQUE("guild_id","reference")
);
--> statement-breakpoint
CREATE TABLE "reimburse_config" (
	"guild_id" varchar(20) PRIMARY KEY NOT NULL,
	"review_channel_id" varchar(20),
	"treasurer_role_id" varchar(20),
	"currency" varchar(3) DEFAULT 'AUD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reimburse_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"actor_id" varchar(20) NOT NULL,
	"from_status" "reimburse_status",
	"to_status" "reimburse_status" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reimburse_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"filename" varchar(260) NOT NULL,
	"content_type" varchar(120),
	"bytes" integer NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reimburse_events" ADD CONSTRAINT "reimburse_events_claim_id_reimburse_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."reimburse_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimburse_receipts" ADD CONSTRAINT "reimburse_receipts_claim_id_reimburse_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."reimburse_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reimburse_claims_guild_status" ON "reimburse_claims" USING btree ("guild_id","status");--> statement-breakpoint
CREATE INDEX "reimburse_claims_claimant" ON "reimburse_claims" USING btree ("guild_id","claimant_id");--> statement-breakpoint
CREATE INDEX "reimburse_events_claim" ON "reimburse_events" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "reimburse_receipts_claim" ON "reimburse_receipts" USING btree ("claim_id");