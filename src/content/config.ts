import { defineCollection, z } from "astro:content";

const blog = defineCollection({
	type: "content",
	schema: z.object({
		title: z.string(),
		date: z.date(),
		tags: z.array(z.string()).default([]),
		summary: z.string(),
	}),
});

const projects = defineCollection({
	type: "data",
	schema: z.array(
		z.object({
			name: z.string(),
			oneLiner: z.string(),
			href: z.string().url(),
			tags: z.array(z.string()).default([]),
		}),
	),
});

const personal = defineCollection({
	type: "data",
	schema: z.object({
		engineeringNow: z.string(),
		golfNow: z.string(),
		languageNow: z.string(),
	}),
});

export const collections = { blog, projects, personal };
