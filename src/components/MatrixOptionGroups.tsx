import { MATRIX_GROUPS } from "../lib/alignment/constants";

export default function MatrixOptionGroups() {
  return MATRIX_GROUPS.map((group) => (
    <optgroup key={group.label} label={group.label}>
      {group.options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </optgroup>
  ));
}
