import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface UseCreditsReturn {
  balance: number;
  isUnlimited: boolean;
  loading: boolean;
  userId: string | null;
  deduct: (cost: number, toolName: string) => Promise<boolean>;
  refund: (cost: number, toolName: string) => Promise<void>;
  verify: (cost: number) => boolean;
  refresh: () => Promise<void>;
}

export function useCredits(): UseCreditsReturn {
  const [balance, setBalance] = useState(0);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('credits, is_unlimited')
      .eq('id', uid)
      .single();
    if (data) {
      const d = data as { credits: number; is_unlimited?: boolean };
      setBalance(d.credits ?? 0);
      setIsUnlimited(d.is_unlimited ?? false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) load(uid);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) load(uid);
      else { setBalance(0); setIsUnlimited(false); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(async () => {
    if (userId) await load(userId);
  }, [userId, load]);

  const deduct = useCallback(async (cost: number, toolName: string): Promise<boolean> => {
    if (!userId) return false;
    if (isUnlimited) return true;
    if (balance < cost) return false;
    const newBal = balance - cost;
    const { error } = await supabase
      .from('profiles')
      .update({ credits: newBal })
      .eq('id', userId);
    if (error) return false;
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      type: 'deduction',
      amount: -cost,
      description: toolName,
    }).then(undefined, () => {});
    setBalance(newBal);
    return true;
  }, [userId, balance, isUnlimited]);

  const refund = useCallback(async (cost: number, toolName: string): Promise<void> => {
    if (!userId || isUnlimited) return;
    const newBal = balance + cost;
    await supabase.from('profiles').update({ credits: newBal }).eq('id', userId).then(undefined, () => {});
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      type: 'refund',
      amount: cost,
      description: `Remboursement — ${toolName}`,
    }).then(undefined, () => {});
    setBalance(newBal);
  }, [userId, balance, isUnlimited]);

  const verify = useCallback((cost: number): boolean => {
    return isUnlimited || balance >= cost;
  }, [balance, isUnlimited]);

  return { balance, isUnlimited, loading, userId, deduct, refund, verify, refresh };
}
