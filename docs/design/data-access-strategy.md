## Solution Design Notes — Caching and Synchronization

The application's data-access strategy is shaped by two main considerations:

1. Expected user behaviour: activity is likely to cluster around meals, with relatively little activity between logging sessions.
2. Infrastructure constraints: the project is designed to remain within free-tier cloud limits, so minimizing API requests, database work, response sizes, and outbound bandwidth is valuable.

### Expected usage patterns

A few assumptions about how users interact with food and weight logs drive the design:

- Usage is likely to spike around meals and snacks, when users record what they have eaten. Those are also natural times to review recent calorie, nutrition, or weight trends.
- After logging a meal and checking their stats, users are unlikely to remain continuously active. In many cases, they will not return until their next meal or snack.
- Historical food and weight logs become increasingly stable with age. Correcting yesterday's log is plausible; reconstructing an exact meal from several days ago requires substantially more effort.
- As a result, I expect logs older than roughly a week to change infrequently.

These patterns make the application a good fit for aggressive client-side reuse of previously fetched data, provided there is still a lightweight way to detect changes made elsewhere.

### Persisted client-side cache

Daily food and weight logs are stored in a persisted client-side cache and keyed by date. Different views derive their own projections from this shared underlying data rather than independently fetching equivalent information from the server.

The cache is implemented with TanStack Query and IndexedDB. Because it contains private user data, the persistence layer also uses cache generations, fence tokens, and explicit logout cleanup to prevent persisted data from one authenticated session being exposed to another.

This approach reduces both repeated API requests and backend egress when several areas of the UI need the same daily-log data.

### Lightweight synchronization

Cached data is considered fresh for one hour. Once it becomes stale, the client does not immediately download the full log again. Instead, it calls a synchronization endpoint using a `versionNumber` associated with each daily log.

If the server's version matches the client's version, the endpoint returns `204 No Content`. In the common case, this allows the backend to confirm that the cache is still current without querying and serializing all of the food entries associated with that day.

Only when the versions differ does the client need the updated data.

I considered treating older logs as permanently fresh after some threshold, such as one week. I rejected that optimization because lightweight version validation is cheap enough to preserve eventual cross-client correctness without introducing a special permanent-staleness rule. Users generally will only use a single device and platform to log food entries for each meal, more is inconvenient, so syncing between several clients can be deferred until the next meal.

### Avoiding unnecessary refetches after writes

Food logging can generate a relatively high number of writes compared with reads. A single meal might contain 5–10 food entries, repeated several times per day for each active user.

For that reason, successful mutations do not automatically invalidate the relevant queries and refetch their complete server state. Instead, mutation responses contain only the information required to update the local cache—for example, the newly created food-entry ID and the updated daily-log `versionNumber`.

The client can then patch its cached state directly.

This avoids turning each write into an additional read while keeping the local cache consistent with the mutation that just occurred.

### Why a one-hour freshness window?

The design assumes that the same account could eventually be used from more than one client—for example, both a web application and a mobile application. Supporting both is partly a portfolio constraint, but it also creates a realistic synchronization problem: one device can modify data that another device has cached.

A one-hour freshness window is a practical compromise.

A stronger design could synchronize every client immediately after every write. I chose not to make that a requirement because I expect typical logging and browsing activity to occur on only one device during a short meal-time session, people are busy and won't use their limited break time to log and browse on multiple devices, so the user experience is not affected.

The one hour freshness window keeps the data fresh during that session, and prevents those screens from repeatedly requesting information that is unlikely to change.

If the user later switches devices, that next session will generally occur far enough in the future—for example, at the next meal—that the cached data will have become stale and the lightweight synchronization check will run.

The result is a cache policy optimized for the application's expected access pattern: reuse data heavily while the user is actively browsing, then cheaply revalidate it when they return.