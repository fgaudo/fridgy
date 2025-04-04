import { Da } from '$lib/core/imports';

export type InternalMessage = Da.TaggedEnum<{
	OpenAddFoodPage: object;
}>;

export const InternalMessage =
	Da.taggedEnum<InternalMessage>();
