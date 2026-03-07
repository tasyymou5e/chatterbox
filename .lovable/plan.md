

## Clean Up Duplicate Profiles & Fix Data Issues

### Issues Found

**1. Data Entry Error — "bob eric@wccgroup.net"**
- Profile: `eric@wccgroup.net.bob` with first_name="bob", last_name="eric@wccgroup.net"
- No roles, no family memberships — appears to be a junk/mistyped account
- **Fix:** Delete this auth user and profile entirely

**2. Duplicate Rebecca Roos (3 accounts)**
| Email | Role | Family |
|---|---|---|
| rebeccaroos@chatterbox.live | parent | Rebecca's Family |
| rebeccaroos@chatterbox.life | admin | (none) |
| rebeccaroos@live.com | parent | Rebecca 's Family |

- **Fix:** Keep `rebeccaroos@chatterbox.live` (active parent) and `rebeccaroos@chatterbox.life` (admin). Delete `rebeccaroos@live.com` and its orphaned family "Rebecca 's Family".

**3. Duplicate Gary Roos (2 accounts)**
| Email | Role | Family |
|---|---|---|
| garyroos81@gmail.com | parent | Gary's Family |
| garyroos@chatterbox.life | admin | (none) |

- **Fix:** Both appear intentional (personal + admin). No action needed unless you want to consolidate.

**4. Test/Orphaned Eric Accounts**
| Email | Role | Family |
|---|---|---|
| eo@wccgroup.net | (main account) | — |
| eo.test.*.zney@wccgroup.net | parent | Eagle Eye Family |
| meo7777777@proton.me | parent | eric's Family |

- **Fix:** Delete the test account `eo.test.*@wccgroup.net` and its family. Delete `meo7777777@proton.me` and its family (leftover test data per prior data correction notes).

**5. Duplicate Keira (2 accounts)**
| Email | Role | Family |
|---|---|---|
| keira.eo@wccgroup.net | — | — |
| keira.meo7777777@proton.me | — | — |

- Per prior corrections, `keira.meo7777777@proton.me` was supposed to be deleted. `keira.eo@wccgroup.net` is the real child account.
- **Fix:** Delete `keira.meo7777777@proton.me` user and profile.

**6. Orphaned jessica account**
- `meo7777777.test.*@proton.me` — test account with family "jessica's Family"
- **Fix:** Delete this test user, profile, and family.

### Implementation Plan

1. **Use the existing `admin-delete-user` edge function** to delete each junk/duplicate auth user (this handles cascading cleanup of profiles, family_members, roles, etc.)
2. **Delete orphaned families** left behind (Rebecca 's Family, Eagle Eye Family, eric's Family, jessica's Family) via direct DB delete
3. **Fix bob's profile** — if deletion isn't possible, update first_name="bob", last_name="" to correct the data entry error before deleting

### Users to Delete (6 total)
1. `0ca85bbc-...` — bob/eric@wccgroup.net.bob (junk)
2. `b89b6868-...` — rebeccaroos@live.com (duplicate)
3. `8f5bccd4-...` — eo.test.*@wccgroup.net (test)
4. `28aca84b-...` — meo7777777@proton.me (test)
5. `e1c95de7-...` — keira.meo7777777@proton.me (orphaned duplicate)
6. `4da38cde-...` — meo7777777.test.*@proton.me / jessica (test)

### Families to Clean Up (4 total)
1. "Rebecca 's Family" (orphaned after user deletion)
2. "🦅 The Eagle Eye Family" (test)
3. "eric's Family" (test)
4. "jessica's Family" (test)

