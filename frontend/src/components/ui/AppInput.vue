<script setup lang="ts">
/**
 * AppInput — Wise text-input.
 *  - white 배경, ink 텍스트, 1px ink 보더, radius 12, padding 12/16, height 48.
 *  - 라벨은 sentence case + semibold 14.
 *  - error 시 negative 톤 보더 + 메시지.
 */
import { computed } from 'vue';

const props = defineProps<{
  modelValue: string | number | null;
  label?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'date';
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  autocomplete?: string;
  name?: string;
}>();

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const value = computed({
  get: () => (props.modelValue == null ? '' : String(props.modelValue)),
  set: (v: string) => emit('update:modelValue', v),
});
</script>

<template>
  <label
    class="field"
    :class="{ 'field--error': !!error }"
  >
    <span
      v-if="label"
      class="field__label"
    >
      {{ label }}<span
        v-if="required"
        class="field__req"
      >*</span>
    </span>
    <input
      v-model="value"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :name="name"
      :autocomplete="autocomplete"
      class="field__input"
    >
    <span
      v-if="error"
      class="field__error"
    >{{ error }}</span>
    <span
      v-else-if="hint"
      class="field__hint"
    >{{ hint }}</span>
  </label>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  width: 100%;
}
.field__label {
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-semibold);
  line-height: 1.4;
  color: var(--color-ink);
  letter-spacing: 0;
  text-transform: none;
}
.field__req {
  color: var(--color-negative);
  margin-left: 4px;
}
.field__input {
  height: 48px;
  padding: 12px 16px;
  background: var(--color-canvas);
  color: var(--color-ink);
  border: 1px solid var(--color-ink);
  border-radius: var(--radius-md);
  font: inherit;
  font-size: var(--fs-body);
  font-weight: var(--fw-regular);
  line-height: 1.5;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.field__input::placeholder {
  color: var(--color-muted);
}
.field__input:disabled {
  background: var(--color-surface-soft);
  color: var(--color-muted);
  border-color: var(--color-hairline);
  cursor: not-allowed;
}
.field__input:focus {
  outline: none;
  border-color: var(--color-ink-deep);
  box-shadow: 0 0 0 3px var(--color-primary-pale);
}
.field__hint {
  font-size: var(--fs-caption);
  color: var(--color-muted);
}
.field__error {
  font-size: var(--fs-caption);
  font-weight: var(--fw-semibold);
  color: var(--color-negative-darkest);
}
.field--error .field__input {
  border-color: var(--color-negative);
}
.field--error .field__input:focus {
  box-shadow: 0 0 0 3px rgba(208, 50, 56, 0.18);
}
</style>
