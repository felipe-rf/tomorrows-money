import { Schema, model } from 'mongoose';

const LogSchema = new Schema({
  log_id: { type: String, required: true },
  user_id: { type: String, required: true },
  action: String,
  entity_type: String,
  entity_id: String,
  old_value: Schema.Types.Mixed,
  new_value: Schema.Types.Mixed,
  ip_address: String,
  user_agent: String,
  created_at: { type: Date, default: Date.now }
});

export const Log = model('Log', LogSchema);
