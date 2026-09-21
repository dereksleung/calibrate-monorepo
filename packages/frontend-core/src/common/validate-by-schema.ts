import * as z from 'zod';

interface ValidateBySchemaOptions<TSchema extends z.ZodTypeAny> {
  data: unknown,
  schema: TSchema,
  url: string,
  logMessage?: string,
}

export function validateBySchema<TSchema extends z.ZodTypeAny>({
  data,
  schema,
  url,
  logMessage = `Validation failed for URL ${url}:`,
}: ValidateBySchemaOptions<TSchema>): z.infer<TSchema> {
  const result = schema.safeParse(data);

  if (!result.success) {
    // TODO: Connect this to an error logger with a message like
    // "The API data format for ${url} changed from expectation."
    console.error(logMessage, result.error);
    return data as z.infer<TSchema>;
  }

  return result.data;
}