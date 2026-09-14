CREATE TABLE "boost_config" (
	"guild_id" varchar(20) PRIMARY KEY NOT NULL,
	"pass_role_id" varchar(20),
	"passes_per_booster" integer DEFAULT 1 NOT NULL,
	"anchor_role_id" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boost_passes" (
	"guild_id" varchar(20) NOT NULL,
	"granter_id" varchar(20) NOT NULL,
	"recipient_id" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boost_passes_guild_recipient" UNIQUE("guild_id","recipient_id")
);
--> statement-breakpoint
CREATE TABLE "boost_roles" (
	"guild_id" varchar(20) NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"role_id" varchar(20) NOT NULL,
	"colour" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boost_roles_guild_user" UNIQUE("guild_id","user_id")
);
--> statement-breakpoint
CREATE INDEX "boost_passes_granter" ON "boost_passes" USING btree ("guild_id","granter_id");--> statement-breakpoint
CREATE INDEX "boost_roles_role" ON "boost_roles" USING btree ("role_id");