<script setup lang="ts">
/**
 * AppInput — text-input on dark surface.
 * 48px / 0px radius / surface-card 배경 / hairline 보더.
 * 라벨은 항상 UPPERCASE 트래킹.
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
      class="field__label label-uppercase"
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
  color: var(--color-body-strong);
}
.field__req {
  color: var(--color-m-red);
  margin-left: 4px;
}
.field__input {
  height: 48px;
  padding: 12px 16px;
  background: var(--color-surface-card);
  color: var(--color-ink);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-none);
  font: inherit;
  font-size: var(--fs-body);
  font-weight: var(--fw-body);
  line-height: 1.5;
  transition: border-color 120ms ease, background-color 120ms ease;
}
.field__input::placeholder {
  color: var(--color-muted);
}
.field__input:focus {
  outline: none;
  border-color: var(--color-ink);
  background: var(--color-surface-elevated);
}
.field__hint {
  font-size: var(--fs-caption);
  letter-spacing: var(--ls-caption);
  color: var(--color-muted);
}
.field__error {
  font-size: var(--fs-caption);
  letter-spacing: var(--ls-caption);
  color: var(--color-m-red);
}
.field--error .field__input {
  border-color: var(--color-m-red);
}
</style>
