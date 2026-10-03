-- Custom SQL migration file, put your code below! --
INSERT INTO "products" ("id", "name", "price") VALUES
  ('salmon-kibble-2kg', 'Salmon kibble, 2 kg', 2499),
  ('clumping-litter-10l', 'Clumping litter, 10 l', 1599);
--> statement-breakpoint
-- A reseller and a cat shelter that buy in bulk. Their API keys are partner_northside_7c1d2e and
-- partner_riverside_91ab44 (sample keys for this tutorial; issue real ones from your partner onboarding).
INSERT INTO "partners" ("id", "name", "api_key_hash") VALUES
  ('northside', 'Northside Pet Supplies', '41fd917040556ae9aac504442c987944087290dcded77615c17adf0888fbac57'),
  ('riverside', 'Riverside Cat Shelter', '3d614d781e563fe03522a0bf4d6a112a29cd4ee2ffcb252a625810cb5a2fdec7');
