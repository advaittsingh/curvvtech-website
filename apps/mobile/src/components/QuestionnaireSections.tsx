import React, { type Dispatch, type SetStateAction } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextStyle, View } from "react-native";
import type { BusinessQuestionnaire } from "../storage/appStorage";
import { colors } from "../theme/colors";
import { AUTH_TEXT_INSET } from "../theme/authUi";
import {
  PAGE1_SOURCES,
  PAGE1_TYPE,
  PAGE2_AFTER,
  PAGE2_CONV_LENGTH,
  PAGE3_CHALLENGE,
  PAGE3_FOLLOWUP,
  PAGE3_TRACK,
  PAGE4_PRIORITIES,
  PAGE4_VOLUME,
  QUESTIONNAIRE_HEADINGS,
} from "../business/questionnaireShared";

export function QuestionnaireSectionHeading({
  pageIndex,
  titleFont,
}: {
  pageIndex: 0 | 1 | 2 | 3;
  titleFont: TextStyle | null;
}) {
  return (
    <Text style={[secStyles.heading, titleFont]}>{QUESTIONNAIRE_HEADINGS[pageIndex]}</Text>
  );
}

export function QuestionnairePageFields({
  pageIndex,
  q,
  setQ,
  bodyFont,
}: {
  pageIndex: 0 | 1 | 2 | 3;
  q: BusinessQuestionnaire;
  setQ: Dispatch<SetStateAction<BusinessQuestionnaire>>;
  bodyFont: TextStyle | null;
}) {
  if (pageIndex === 0) {
    return (
      <>
        <Text style={[secStyles.qLabel, bodyFont]}>What best describes your business?</Text>
        <View style={secStyles.optionCol}>
          {PAGE1_TYPE.map((opt) => (
            <OptionRow
              key={opt.id}
              label={opt.label}
              selected={q.businessType === opt.id}
              onPress={() => setQ((s) => ({ ...s, businessType: opt.id }))}
              bodyFont={bodyFont}
            />
          ))}
        </View>
        <Text style={[secStyles.qLabel, bodyFont, secStyles.qSpacer]}>
          What do you primarily sell or offer?
        </Text>
        <TextInput
          style={[secStyles.textInput, secStyles.textInputCap, bodyFont]}
          placeholder="Cars, digital marketing services, home decor…"
          placeholderTextColor={colors.textMuted}
          value={q.primaryOffer}
          onChangeText={(t) => setQ((s) => ({ ...s, primaryOffer: t }))}
          multiline
          scrollEnabled
          textAlignVertical="top"
        />
        <Text style={[secStyles.qLabel, bodyFont, secStyles.qSpacer]}>
          Where do most of your customers come from?
        </Text>
        <Text style={[secStyles.qHint, bodyFont]}>Select all that apply</Text>
        <View style={secStyles.optionCol}>
          {PAGE1_SOURCES.map((opt) => {
            const on = q.customerSources.includes(opt.id);
            return (
              <OptionRow
                key={opt.id}
                label={opt.label}
                selected={on}
                multi
                onPress={() =>
                  setQ((s) => ({
                    ...s,
                    customerSources: on
                      ? s.customerSources.filter((id) => id !== opt.id)
                      : [...s.customerSources, opt.id],
                  }))
                }
                bodyFont={bodyFont}
              />
            );
          })}
        </View>
      </>
    );
  }

  if (pageIndex === 1) {
    return (
      <>
        <Text style={[secStyles.qLabel, bodyFont]}>What do customers usually ask you first?</Text>
        <TextInput
          style={[secStyles.textInput, secStyles.textInputCap, bodyFont]}
          placeholder="Price, availability, details…"
          placeholderTextColor={colors.textMuted}
          value={q.customersAskFirst}
          onChangeText={(t) => setQ((s) => ({ ...s, customersAskFirst: t }))}
          multiline
          scrollEnabled
          textAlignVertical="top"
        />
        <Text style={[secStyles.qLabel, bodyFont, secStyles.qSpacer]}>
          How do conversations usually go?
        </Text>
        <View style={secStyles.optionCol}>
          {PAGE2_CONV_LENGTH.map((opt) => (
            <OptionRow
              key={opt.id}
              label={opt.label}
              selected={q.conversationLength === opt.id}
              onPress={() => setQ((s) => ({ ...s, conversationLength: opt.id }))}
              bodyFont={bodyFont}
            />
          ))}
        </View>
        <Text style={[secStyles.qLabel, bodyFont, secStyles.qSpacer]}>
          What usually happens after a conversation?
        </Text>
        <View style={secStyles.optionCol}>
          {PAGE2_AFTER.map((opt) => (
            <OptionRow
              key={opt.id}
              label={opt.label}
              selected={q.afterConversation === opt.id}
              onPress={() => setQ((s) => ({ ...s, afterConversation: opt.id }))}
              bodyFont={bodyFont}
            />
          ))}
        </View>
      </>
    );
  }

  if (pageIndex === 2) {
    return (
      <>
        <Text style={[secStyles.qLabel, bodyFont]}>How do you currently track leads?</Text>
        <Text style={[secStyles.qHint, bodyFont]}>Select all that apply</Text>
        <View style={secStyles.optionCol}>
          {PAGE3_TRACK.map((opt) => {
            const on = q.leadTracking.includes(opt.id);
            return (
              <OptionRow
                key={opt.id}
                label={opt.label}
                selected={on}
                multi
                onPress={() =>
                  setQ((s) => ({
                    ...s,
                    leadTracking: on
                      ? s.leadTracking.filter((id) => id !== opt.id)
                      : [...s.leadTracking, opt.id],
                  }))
                }
                bodyFont={bodyFont}
              />
            );
          })}
        </View>
        <Text style={[secStyles.qLabel, bodyFont, secStyles.qSpacer]}>What's your biggest challenge?</Text>
        <View style={secStyles.optionCol}>
          {PAGE3_CHALLENGE.map((opt) => (
            <OptionRow
              key={opt.id}
              label={opt.label}
              selected={q.biggestChallenge === opt.id}
              onPress={() => setQ((s) => ({ ...s, biggestChallenge: opt.id }))}
              bodyFont={bodyFont}
            />
          ))}
        </View>
        <Text style={[secStyles.qLabel, bodyFont, secStyles.qSpacer]}>How often do you follow up?</Text>
        <View style={secStyles.optionCol}>
          {PAGE3_FOLLOWUP.map((opt) => (
            <OptionRow
              key={opt.id}
              label={opt.label}
              selected={q.followUpFrequency === opt.id}
              onPress={() => setQ((s) => ({ ...s, followUpFrequency: opt.id }))}
              bodyFont={bodyFont}
            />
          ))}
        </View>
      </>
    );
  }

  return (
    <>
      <Text style={[secStyles.qLabel, bodyFont]}>What matters most to you?</Text>
      <Text style={[secStyles.qHint, bodyFont]}>Select all that apply</Text>
      <View style={secStyles.optionCol}>
        {PAGE4_PRIORITIES.map((opt) => {
          const on = q.priorities.includes(opt.id);
          return (
            <OptionRow
              key={opt.id}
              label={opt.label}
              selected={on}
              multi
              onPress={() =>
                setQ((s) => ({
                  ...s,
                  priorities: on
                    ? s.priorities.filter((id) => id !== opt.id)
                    : [...s.priorities, opt.id],
                }))
              }
              bodyFont={bodyFont}
            />
          );
        })}
      </View>
      <Text style={[secStyles.qLabel, bodyFont, secStyles.qSpacer]}>
        How many customers do you handle daily?
      </Text>
      <View style={secStyles.optionCol}>
        {PAGE4_VOLUME.map((opt) => (
          <OptionRow
            key={opt.id}
            label={opt.label}
            selected={q.dailyCustomerVolume === opt.id}
            onPress={() => setQ((s) => ({ ...s, dailyCustomerVolume: opt.id }))}
            bodyFont={bodyFont}
          />
        ))}
      </View>
      <Text style={[secStyles.qLabel, bodyFont, secStyles.qSpacer]}>
        What would success look like for you?
      </Text>
      <TextInput
        style={[secStyles.textInput, secStyles.textInputCap, bodyFont]}
        placeholder="Better conversions, less stress, more organized…"
        placeholderTextColor={colors.textMuted}
        value={q.successVision}
        onChangeText={(t) => setQ((s) => ({ ...s, successVision: t }))}
        multiline
        scrollEnabled
        textAlignVertical="top"
      />
    </>
  );
}

function OptionRow({
  label,
  selected,
  multi,
  onPress,
  bodyFont,
}: {
  label: string;
  selected: boolean;
  multi?: boolean;
  onPress: () => void;
  bodyFont: TextStyle | null;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        secStyles.option,
        selected && secStyles.optionSelected,
        pressed && secStyles.optionPressed,
      ]}
    >
      <View style={[secStyles.dot, multi && secStyles.dotMulti, selected && secStyles.dotOn]} />
      <Text style={[secStyles.optionLabel, bodyFont]}>{label}</Text>
    </Pressable>
  );
}

const secStyles = StyleSheet.create({
  heading: {
    marginHorizontal: AUTH_TEXT_INSET,
    fontSize: 28,
    lineHeight: 34,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  qLabel: {
    marginHorizontal: AUTH_TEXT_INSET,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 10,
  },
  qHint: {
    marginHorizontal: AUTH_TEXT_INSET,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: -4,
    marginBottom: 10,
  },
  qSpacer: { marginTop: 22 },
  optionCol: { gap: 10, marginBottom: 4 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: AUTH_TEXT_INSET,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  optionPressed: { opacity: 0.92 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textMuted,
    marginRight: 12,
  },
  dotMulti: { borderRadius: 4 },
  dotOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  textInput: {
    marginHorizontal: AUTH_TEXT_INSET,
    minHeight: 100,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  textInputCap: {
    maxHeight: 200,
  },
});
