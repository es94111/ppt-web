import { db } from "@/lib/db";

export type ShareLinkAnalytics = {
  viewCount: number;
  uniqueVisitors: number;
  completionRate: number;
  dropOffSlide: number | null;
  dropOffCount: number;
  lastViewedAt: Date | null;
};

export async function getShareLinkAnalytics(deckId: string, linkIds: string[], slideCount: number) {
  const analytics = new Map<string, ShareLinkAnalytics>();
  for (const id of linkIds) analytics.set(id, emptyAnalytics());
  if (!linkIds.length) return analytics;

  const where = { deckId, shareLinkId: { in: linkIds } };
  const [totals, slideGroups, visitorRows] = await db.$transaction([
    db.viewLog.groupBy({ by: ["shareLinkId"], where, _count: { _all: true }, _max: { viewedAt: true } }),
    db.viewLog.groupBy({ by: ["shareLinkId", "slideOrder"], where: { ...where, slideOrder: { not: null } }, _count: { _all: true } }),
    db.viewLog.groupBy({ by: ["shareLinkId", "userId", "ipAddress"], where, _max: { slideOrder: true } }),
  ]);

  for (const row of totals) {
    if (!row.shareLinkId) continue;
    const item = analytics.get(row.shareLinkId) ?? emptyAnalytics();
    item.viewCount = row._count._all;
    item.lastViewedAt = row._max.viewedAt ?? null;
    analytics.set(row.shareLinkId, item);
  }

  const completedByLink = new Map<string, number>();
  for (const row of visitorRows) {
    if (!row.shareLinkId) continue;
    const item = analytics.get(row.shareLinkId) ?? emptyAnalytics();
    item.uniqueVisitors += 1;
    if (slideCount > 0 && (row._max.slideOrder ?? 0) >= slideCount) completedByLink.set(row.shareLinkId, (completedByLink.get(row.shareLinkId) ?? 0) + 1);
    analytics.set(row.shareLinkId, item);
  }

  for (const [linkId, item] of analytics) {
    const completed = completedByLink.get(linkId) ?? 0;
    item.completionRate = item.uniqueVisitors ? Math.round(completed / item.uniqueVisitors * 100) : 0;
  }

  const slideViewsByLink = new Map<string, Map<number, number>>();
  for (const row of slideGroups) {
    if (!row.shareLinkId || row.slideOrder === null) continue;
    const slideViews = slideViewsByLink.get(row.shareLinkId) ?? new Map<number, number>();
    slideViews.set(row.slideOrder, row._count._all);
    slideViewsByLink.set(row.shareLinkId, slideViews);
  }
  for (const [linkId, slideViews] of slideViewsByLink) {
    const item = analytics.get(linkId) ?? emptyAnalytics();
    for (let order = 1; order < slideCount; order++) {
      const drop = Math.max(0, (slideViews.get(order) ?? 0) - (slideViews.get(order + 1) ?? 0));
      if (drop > item.dropOffCount) {
        item.dropOffSlide = order;
        item.dropOffCount = drop;
      }
    }
    analytics.set(linkId, item);
  }

  return analytics;
}

function emptyAnalytics(): ShareLinkAnalytics {
  return { viewCount: 0, uniqueVisitors: 0, completionRate: 0, dropOffSlide: null, dropOffCount: 0, lastViewedAt: null };
}
