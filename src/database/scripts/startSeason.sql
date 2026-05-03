CREATE OR REPLACE PROCEDURE startSeason (
    serverId: BIGINT,
    seasonName: varchar(40)
)
BEGIN
    DECLARE @seasonId int
    DECLARE @currentDate DATE
    SELECT @currentDate = now()::date 

    -- Don't create a new season if there is one currently going with the same 'ruleset'
    INSERT INTO season (serverId, seasonName, activeSeason, startDate)
    SELECT @serverId, @seasonName, true, currentDate
    WHERE NOT EXISTS (
        SELECT 1
        FROM season
        WHERE serverId = @serverId
        AND seasonName = @seasonName
        AND (activeSeason = true OR (currentDate >= startDate AND currentDate <= endDate))
    ) 
    RETURNING id into @seasonId

    select

    -- You can, however, make a new season set within the season (aka it's a new week)
    INSERT INTO seasonSet(serverId, seasonId)

END