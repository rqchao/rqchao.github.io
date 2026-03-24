import { getCollection } from "astro:content";

export async function getBlogPosts() {
	return (await getCollection("blog")).sort(
		(a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
	);
}

export async function getProjects() {
	const projectsCollection = await getCollection("projects");
	return projectsCollection[0]?.data ?? [];
}

export async function getPersonalStatus() {
	const personalCollection = await getCollection("personal");
	return personalCollection[0]?.data ?? null;
}
