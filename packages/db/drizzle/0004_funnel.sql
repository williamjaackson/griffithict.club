CREATE TYPE "public"."funnel_confidence" AS ENUM('certain', 'ambiguous', 'vanity', 'unknown', 'offline');--> statement-breakpoint
CREATE TABLE "funnel_guilds" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"log_channel_id" varchar(20),
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "funnel_invites" (
	"code" varchar(32) PRIMARY KEY NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"inviter_id" varchar(20),
	"source_id" uuid,
	"uses" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel_joins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"member_id" varchar(20) NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"invite_code" varchar(32),
	"inviter_id" varchar(20),
	"source_id" uuid,
	"source_name" varchar(60),
	"confidence" "funnel_confidence" NOT NULL,
	"candidates" jsonb,
	"account_created_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funnel_joins_guild_member" UNIQUE("guild_id","member_id","joined_at")
);
--> statement-breakpoint
CREATE TABLE "funnel_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"name" varchar(60) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funnel_sources_guild_name" UNIQUE("guild_id","name")
);
--> statement-breakpoint
ALTER TABLE "funnel_invites" ADD CONSTRAINT "funnel_invites_source_id_funnel_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."funnel_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_joins" ADD CONSTRAINT "funnel_joins_source_id_funnel_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."funnel_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "funnel_invites_guild" ON "funnel_invites" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "funnel_joins_guild_joined" ON "funnel_joins" USING btree ("guild_id","joined_at");--> statement-breakpoint
CREATE INDEX "funnel_joins_guild_inviter" ON "funnel_joins" USING btree ("guild_id","inviter_id");