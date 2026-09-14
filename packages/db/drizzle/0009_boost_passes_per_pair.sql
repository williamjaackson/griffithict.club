ALTER TABLE "boost_passes" DROP CONSTRAINT "boost_passes_guild_recipient";--> statement-breakpoint
CREATE INDEX "boost_passes_recipient" ON "boost_passes" USING btree ("guild_id","recipient_id");--> statement-breakpoint
ALTER TABLE "boost_passes" ADD CONSTRAINT "boost_passes_guild_pair" UNIQUE("guild_id","granter_id","recipient_id");