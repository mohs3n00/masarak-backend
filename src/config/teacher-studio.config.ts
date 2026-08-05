import { registerAs } from '@nestjs/config';

export default registerAs('teacherStudio', () => ({
  // OpenRouter's free router picks an available free model at request time.
  model: process.env.TEACHER_STUDIO_MODEL || 'openrouter/free',
  promptVersion: process.env.TEACHER_STUDIO_PROMPT_VERSION || 'teacher-studio-campaign-v1',
}));
