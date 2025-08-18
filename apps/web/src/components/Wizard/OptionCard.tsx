"use client";
import { useState } from "react";
import styles from "./Wizard.module.css";

type Props = {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onChoose?: () => void;
  chosen?: boolean;
};

export default function OptionCard({ title, value, onChange, onChoose, chosen }: Props) {
  const [local, setLocal] = useState(value);
  return (
    <div className={`${styles.card} ${chosen ? styles.cardChosen : ""}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>{title}</div>
        {onChoose && (
          <button className={styles.primary} onClick={onChoose}>
            Choose
          </button>
        )}
      </div>
      <textarea
        className={styles.textarea}
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
      />
    </div>
  );
}
