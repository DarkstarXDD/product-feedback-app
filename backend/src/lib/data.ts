import { Prisma } from "../db/client"

export const statuses: Prisma.StatusCreateInput[] = [
  { name: "Planned", slug: "planned" },
  { name: "In-Progress", slug: "in-progress" },
  { name: "Live", slug: "live" },
]

export const categories: Prisma.CategoryCreateInput[] = [
  { name: "UI", slug: "ui" },
  { name: "UX", slug: "ux" },
  { name: "Enhancement", slug: "enhancement" },
  { name: "Bug", slug: "bug" },
  { name: "Feature", slug: "feature" },
]
