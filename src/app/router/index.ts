import { Router } from "express";

import { AuthRoutes } from "../module/auth/auth.route";
import { BookmarkRoutes } from "../module/bookmark/bookmark.route";
import { PostBookmarkRoutes } from "../module/bookmark/post-bookmark.route";
import { CommentRoutes } from "../module/comment/comment.route";
import { CommunityMemberRoutes } from "../module/community-member/community-member.route";
import {
  CommunityNestedRuleRoutes,
  CommunityRuleRoutes,
} from "../module/community-rule/community-rule.route";
import { CommunityRoutes } from "../module/community/community.route";
import { PostCommentRoutes } from "../module/comment/post-comment.route";
import { EducationRoutes } from "../module/education/education.route";
import { ExperienceRoutes } from "../module/experience/experience.route";
import { FollowRoutes } from "../module/follow/follow.route";
import { HashtagRoutes } from "../module/hashtag/hashtag.route";
import { PostRoutes } from "../module/post/post.route";
import { NotificationRoutes } from "../module/notification/notification.route";
import { ProfileIdentityRoutes } from "../module/profile/profile.route";
import { CommentReactionRoutes } from "../module/reaction/comment-reaction.route";
import { PostReactionRoutes } from "../module/reaction/post-reaction.route";
import { SkillRoutes } from "../module/skill/skill.route";
import { UserRoutes } from "../module/user/user.route";
import { CommentVoteRoutes } from "../module/vote/comment-vote.route";
import { PostVoteRoutes } from "../module/vote/post-vote.route";
import { ReportRoutes } from "../module/report/report.route";
import { SearchRoutes } from "../module/search";
import { AdminRoutes } from "../module/admin";
import { TrendingRoutes } from "../module/trending";

const router = Router();

const moduleRoutes: { path: string; route: Router }[] = [
  { path: "/auth", route: AuthRoutes },
  { path: "/users", route: FollowRoutes },
  { path: "/users", route: UserRoutes },
  { path: "/profiles", route: ProfileIdentityRoutes },
  { path: "/profile/experience", route: ExperienceRoutes },
  { path: "/profile/education", route: EducationRoutes },
  { path: "/profile/skills", route: SkillRoutes },
  { path: "/posts", route: PostBookmarkRoutes },
  { path: "/posts", route: PostReactionRoutes },
  { path: "/posts", route: PostVoteRoutes },
  { path: "/posts", route: PostCommentRoutes },
  { path: "/posts", route: PostRoutes },
  { path: "/comments", route: CommentReactionRoutes },
  { path: "/comments", route: CommentVoteRoutes },
  { path: "/comments", route: CommentRoutes },
  { path: "/bookmarks", route: BookmarkRoutes },
  { path: "/hashtags", route: HashtagRoutes },
  { path: "/notifications", route: NotificationRoutes },
  { path: "/reports", route: ReportRoutes },
  { path: "/search", route: SearchRoutes },
  { path: "/admin", route: AdminRoutes },
  { path: "/trending", route: TrendingRoutes },
  { path: "/communities", route: CommunityNestedRuleRoutes },
  { path: "/communities", route: CommunityMemberRoutes },
  { path: "/communities", route: CommunityRoutes },
  { path: "/community-rules", route: CommunityRuleRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
