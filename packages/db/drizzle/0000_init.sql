CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'cancelled');--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" varchar(300),
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"location" varchar(200),
	"cover_image" varchar(500),
	"registration_url" varchar(500),
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"discord_event_id" varchar(40),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "events_discord_event_id_unique" UNIQUE("discord_event_id")
);
--> statement-breakpoint
CREATE TABLE "sponsorship_enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier" varchar(40) NOT NULL,
	"period" varchar(60) NOT NULL,
	"organisation" varchar(200) NOT NULL,
	"contact_name" varchar(200) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(40),
	"message" text,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "events_status_starts_at_idx" ON "events" USING btree ("status","starts_at");